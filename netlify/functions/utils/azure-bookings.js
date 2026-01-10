// Azure Table Storage client for booking and reminder management
const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

let bookingsClient = null;

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

/**
 * Create a new booking record in Azure Table Storage
 * @param {Object} bookingData - Booking information from Stripe webhook
 * @returns {Object} Created entity
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
    console.log(`✅ Booking saved to Azure Table Storage: ${entity.rowKey}`);
    return entity;
  } catch (error) {
    console.error('❌ Error creating booking in Azure Table Storage:', error);
    throw error;
  }
}

/**
 * Get bookings that need reminders
 * Checks for 24h, 2h, and balance-due reminders
 * @returns {Array} Bookings needing reminders with flags (_needs24h, _needs2h, _needsBalance)
 */
async function getBookingsNeedingReminders() {
  const client = getBookingsClient();
  
  try {
    const now = new Date();
    const bookings = [];
    
    // Query all bookings (Table Storage doesn't support complex date queries on non-key fields)
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
    console.error('❌ Error getting bookings for reminders:', error);
    throw error;
  }
}

/**
 * Mark reminder as sent in Azure Table Storage
 * @param {string} bookingId - Row key (Stripe session ID)
 * @param {string} reminderType - '24h', '2h', or 'balance'
 * @returns {Object} Updated entity
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
    console.log(`✅ Reminder marked as sent: ${bookingId} (${reminderType})`);
    return entity;
  } catch (error) {
    console.error('❌ Error marking reminder sent:', error);
    throw error;
  }
}

/**
 * Get booking by Stripe session ID
 * @param {string} stripeSessionId - Stripe checkout session ID
 * @returns {Object|null} Booking entity or null if not found
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
    console.error('❌ Error getting booking by Stripe session:', error);
    throw error;
  }
}

module.exports = {
  createBooking,
  getBookingsNeedingReminders,
  markReminderSent,
  getBookingByStripeSession,
};
