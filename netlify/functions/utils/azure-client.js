// Azure Table Storage client for booking and subscriber management
const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

let bookingsClient = null;
let subscribersClient = null;

function getBookingsClient() {
  if (!bookingsClient) {
    const credential = new AzureNamedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT,
      process.env.AZURE_STORAGE_KEY
    );
    bookingsClient = new TableClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
      'bookings',
      credential
    );
  }
  return bookingsClient;
}

function getSubscribersClient() {
  if (!subscribersClient) {
    const credential = new AzureNamedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT,
      process.env.AZURE_STORAGE_KEY
    );
    subscribersClient = new TableClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
      'newslettersubscribers',
      credential
    );
  }
  return subscribersClient;
}

/**
 * Create a new booking record
 */
async function createBooking(bookingData) {
  const client = getBookingsClient();
  
  try {
    // Use Stripe session ID as row key for easy lookup
    const entity = {
      partitionKey: 'booking',
      rowKey: bookingData.stripeSessionId,
      stripeSessionId: bookingData.stripeSessionId,
      customerName: bookingData.customerName,
      customerEmail: bookingData.customerEmail,
      service: bookingData.service,
      packageName: bookingData.packageName || '',
      hours: bookingData.hours || 2,
      total: bookingData.total,
      deposit: bookingData.deposit,
      balanceDue: bookingData.balanceDue,
      sessionDate: bookingData.sessionDate || '',
      sessionTime: bookingData.sessionTime || '',
      sessionDateTime: bookingData.sessionDateTime || '',
      addons: bookingData.addons || '',
      paymentLink: bookingData.paymentLink || '',
      reminder24hSent: false,
      reminder2hSent: false,
      balanceReminderSent: false,
      reminder24hSentAt: '',
      reminder2hSentAt: '',
      balanceReminderSentAt: '',
      createdAt: new Date().toISOString(),
    };
    
    await client.createEntity(entity);
    return entity;
  } catch (error) {
    console.error('Error creating booking in Azure Table Storage:', error);
    throw error;
  }
}

/**
 * Get bookings that need reminders
 */
async function getBookingsNeedingReminders() {
  const client = getBookingsClient();
  
  try {
    const now = new Date();
    const bookings = [];
    
    // Query all bookings (Table Storage doesn't support complex queries on non-key fields)
    const entities = client.listEntities({
      queryOptions: { filter: `PartitionKey eq 'booking'` }
    });
    
    for await (const entity of entities) {
      if (!entity.sessionDateTime) continue;
      
      const sessionTime = new Date(entity.sessionDateTime);
      const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
      
      // Check if 24h reminder needed (between 23.75 and 24.25 hours)
      const needs24h = !entity.reminder24hSent && 
                       hoursUntilSession >= 23.75 && 
                       hoursUntilSession <= 24.25;
      
      // Check if 2h reminder needed (between 1.75 and 2.25 hours)
      const needs2h = !entity.reminder2hSent && 
                      hoursUntilSession >= 1.75 && 
                      hoursUntilSession <= 2.25;
      
      // Check if balance reminder needed (24h before and balance > 0)
      const needsBalance = !entity.balanceReminderSent && 
                           entity.balanceDue > 0 && 
                           hoursUntilSession >= 23.75 && 
                           hoursUntilSession <= 24.25;
      
      if (needs24h || needs2h || needsBalance) {
        bookings.push({
          id: entity.rowKey,
          ...entity,
          _needs24h: needs24h,
          _needs2h: needs2h,
          _needsBalance: needsBalance
        });
      }
    }
    
    return bookings;
  } catch (error) {
    console.error('Error getting bookings for reminders:', error);
    throw error;
  }
}

/**
 * Mark reminder as sent
 */
async function markReminderSent(bookingId, reminderType) {
  const client = getBookingsClient();
  
  try {
    const entity = await client.getEntity('booking', bookingId);
    
    if (reminderType === '24h') {
      entity.reminder24hSent = true;
      entity.reminder24hSentAt = new Date().toISOString();
    } else if (reminderType === '2h') {
      entity.reminder2hSent = true;
      entity.reminder2hSentAt = new Date().toISOString();
    } else if (reminderType === 'balance') {
      entity.balanceReminderSent = true;
      entity.balanceReminderSentAt = new Date().toISOString();
    }
    
    await client.updateEntity(entity, 'Merge');
    return entity;
  } catch (error) {
    console.error('Error marking reminder sent:', error);
    throw error;
  }
}

/**
 * Get booking by Stripe session ID
 */
async function getBookingByStripeSession(stripeSessionId) {
  const client = getBookingsClient();
  
  try {
    const entity = await client.getEntity('booking', stripeSessionId);
    return {
      id: entity.rowKey,
      ...entity
    };
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }
    console.error('Error getting booking by Stripe session:', error);
    throw error;
  }
}

/**
 * Subscribe email to newsletter
 */
async function subscribeToNewsletter(email, name = null, source = 'website') {
  const client = getSubscribersClient();
  
  try {
    const emailLower = email.toLowerCase();
    const rowKey = emailLower.replace(/[^a-z0-9]/g, '_'); // Table Storage row key-safe
    
    // Check if already exists
    let existing;
    try {
      existing = await client.getEntity('subscriber', rowKey);
    } catch (error) {
      if (error.statusCode !== 404) throw error;
    }
    
    if (existing) {
      // Update existing subscription
      existing.isSubscribed = true;
      existing.unsubscribedAt = '';
      existing.resubscribedAt = new Date().toISOString();
      if (name) existing.name = name;
      
      await client.updateEntity(existing, 'Merge');
      return { status: 'resubscribed', email };
    }
    
    // Create new subscription
    const entity = {
      partitionKey: 'subscriber',
      rowKey: rowKey,
      email: emailLower,
      name: name || '',
      source: source,
      isSubscribed: true,
      subscribedAt: new Date().toISOString(),
      unsubscribedAt: '',
      resubscribedAt: ''
    };
    
    await client.createEntity(entity);
    return { status: 'subscribed', email };
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    throw error;
  }
}

/**
 * Unsubscribe email from newsletter
 */
async function unsubscribeFromNewsletter(email) {
  const client = getSubscribersClient();
  
  try {
    const emailLower = email.toLowerCase();
    const rowKey = emailLower.replace(/[^a-z0-9]/g, '_');
    
    const entity = await client.getEntity('subscriber', rowKey);
    entity.isSubscribed = false;
    entity.unsubscribedAt = new Date().toISOString();
    
    await client.updateEntity(entity, 'Merge');
    return { status: 'unsubscribed', email };
  } catch (error) {
    if (error.statusCode === 404) {
      return { status: 'not_found', email };
    }
    console.error('Error unsubscribing from newsletter:', error);
    throw error;
  }
}

/**
 * Get all active subscribers
 */
async function getActiveSubscribers() {
  const client = getSubscribersClient();
  
  try {
    const subscribers = [];
    
    // Query subscribers where isSubscribed = true
    const entities = client.listEntities({
      queryOptions: { filter: `PartitionKey eq 'subscriber' and isSubscribed eq true` }
    });
    
    for await (const entity of entities) {
      subscribers.push({
        id: entity.rowKey,
        email: entity.email,
        name: entity.name,
        source: entity.source,
        subscribedAt: entity.subscribedAt
      });
    }
    
    return subscribers;
  } catch (error) {
    console.error('Error getting active subscribers:', error);
    throw error;
  }
}

/**
 * Check if email is subscribed
 */
async function isSubscribed(email) {
  const client = getSubscribersClient();
  
  try {
    const emailLower = email.toLowerCase();
    const rowKey = emailLower.replace(/[^a-z0-9]/g, '_');
    
    const entity = await client.getEntity('subscriber', rowKey);
    return entity.isSubscribed === true;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

module.exports = {
  createBooking,
  getBookingsNeedingReminders,
  markReminderSent,
  getBookingByStripeSession,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getActiveSubscribers,
  isSubscribed,
};
