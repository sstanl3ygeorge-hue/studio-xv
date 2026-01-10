// Azure Table Storage helper for booking and reminder management
// Focused on session reminders only - newsletter logic removed
const { TableClient } = require('@azure/data-tables');

let bookingsClient = null;

/**
 * Get or create TableClient for bookings
 */
function getBookingsClient() {
  if (!bookingsClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const tableName = process.env.AZURE_TABLE_NAME || 'bookings';
    
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }
    
    bookingsClient = TableClient.fromConnectionString(connectionString, tableName);
  }
  return bookingsClient;
}

/**
 * Save booking to Azure Table Storage
 * @param {Object} booking - Booking data from Stripe webhook
 * @returns {Promise<Object>} Created entity
 */
async function saveBookingToAzure(booking) {
  const client = getBookingsClient();
  
  try {
    // 🔒 CRITICAL: Force rowKey = Stripe Checkout Session ID (for reminder lookups)
    // NEVER use booking_<timestamp> - reminders must reference the Stripe session ID
    const rowKey = booking.stripeSessionId || booking.bookingId;
    
    if (!rowKey || !rowKey.startsWith('cs_')) {
      console.warn(`⚠️ Invalid Stripe session ID for Azure rowKey: ${rowKey}`);
    }
    
    const entity = {
      partitionKey: 'booking',
      rowKey: rowKey,
      
      // Booking details
      stripeSessionId: booking.stripeSessionId || '',
      customerName: booking.customerName || '',
      customerEmail: booking.customerEmail || '',
      service: booking.service || '',
      packageName: booking.packageName || '',
      hours: booking.hours || 2,
      total: booking.total || 0,
      deposit: booking.deposit || 0,
      balanceDue: booking.balanceDue || 0,
      
      // Session details
      sessionDate: booking.sessionDate || '',
      sessionTime: booking.sessionTime || '',
      sessionDateTime: booking.sessionDateTime || '',
      addons: booking.addons || '',
      paymentLink: booking.paymentLink || '',
      
      // Reminder tracking flags
      reminder24hSent: false,
      reminder24hSentAt: '',
      reminder2hSent: false,
      reminder2hSentAt: '',
      startPaymentReminderSent: false,
      startPaymentReminderSentAt: '',
      postSessionPaymentReminderSent: false,
      postSessionPaymentReminderSentAt: '',
      
      // Balance payment tracking
      balancePaid: false,
      balancePaidAt: '',
      balancePaymentIntentId: '',
      balancePaymentMethod: '',
      
      // Metadata
      createdAt: new Date().toISOString(),
    };
    
    await client.createEntity(entity);
    console.log(`✅ Booking saved to Azure Table Storage: ${rowKey}`);
    
    return entity;
  } catch (error) {
    console.error('❌ Failed to save booking to Azure:', error.message);
    throw error;
  }
}

/**
 * Get bookings that need reminders
 * @returns {Promise<Array>} Array of bookings needing reminders
 */
async function getBookingsNeedingReminders() {
  const client = getBookingsClient();
  
  try {
    const now = new Date();
    const bookingsNeedingReminders = [];
    
    // Query all bookings with partition key 'booking'
    const entities = client.listEntities({
      queryOptions: { filter: `PartitionKey eq 'booking'` }
    });
    
    for await (const entity of entities) {
      // Skip bookings without session date/time
      if (!entity.sessionDateTime) continue;
      
      const sessionTime = new Date(entity.sessionDateTime);
      const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
      
      // Skip past sessions
      if (hoursUntilSession < 0) continue;
      
      // Check if 24h reminder needed (between 23.75 and 24.25 hours)
      const needs24h = !entity.reminder24hSent && 
                       hoursUntilSession >= 23.75 && 
                       hoursUntilSession <= 24.25;
      
      // Check if 2h reminder needed (between 1.75 and 2.25 hours)
      const needs2h = !entity.reminder2hSent && 
                      hoursUntilSession >= 1.75 && 
                      hoursUntilSession <= 2.25;
      
      // Check if start payment reminder needed (within -5 to +10 minutes of session start)
      const minutesUntilSession = (sessionTime - now) / (1000 * 60);
      const needsStartPayment = !entity.startPaymentReminderSent && 
                                entity.balanceDue > 0 && 
                                entity.balancePaid !== true &&
                                minutesUntilSession >= -5 && 
                                minutesUntilSession <= 10;
      
      // Check if post-session payment reminder needed (24h after session, balance unpaid)
      const hoursSinceSession = (now - sessionTime) / (1000 * 60 * 60);
      const needsPostSessionPayment = !entity.postSessionPaymentReminderSent && 
                                      entity.balanceDue > 0 && 
                                      entity.balancePaid !== true &&
                                      hoursSinceSession >= 23.75 && 
                                      hoursSinceSession <= 24.25;
      
      if (needs24h || needs2h || needsStartPayment || needsPostSessionPayment) {
        bookingsNeedingReminders.push({
          ...entity,
          _needs24h: needs24h,
          _needs2h: needs2h,
          _needsStartPayment: needsStartPayment,
          _needsPostSessionPayment: needsPostSessionPayment
        });
      }
    }
    
    return bookingsNeedingReminders;
  } catch (error) {
    console.error('❌ Failed to get bookings from Azure:', error.message);
    throw error;
  }
}

/**
 * Mark reminder as sent in Azure Table Storage
 * @param {string} rowKey - The RowKey of the booking entity
 * @param {string} reminderType - '24h', '2h', or 'balance'
 */
async function markReminderSent(rowKey, reminderType) {
  const client = getBookingsClient();
  
  try {
    const entity = await client.getEntity('booking', rowKey);
    
    const timestamp = new Date().toISOString();
    
    if (reminderType === '24h') {
      entity.reminder24hSent = true;
      entity.reminder24hSentAt = timestamp;
    } else if (reminderType === '2h') {
      entity.reminder2hSent = true;
      entity.reminder2hSentAt = timestamp;
    } else if (reminderType === 'startPayment') {
      entity.startPaymentReminderSent = true;
      entity.startPaymentReminderSentAt = timestamp;
    } else if (reminderType === 'postSessionPayment') {
      entity.postSessionPaymentReminderSent = true;
      entity.postSessionPaymentReminderSentAt = timestamp;
    }
    
    await client.updateEntity(entity, 'Merge');
    console.log(`✅ Marked ${reminderType} reminder as sent for ${rowKey}`);
    
    return entity;
  } catch (error) {
    console.error(`❌ Failed to mark reminder sent in Azure:`, error.message);
    throw error;
  }
}

/**
 * Mark balance as paid for a booking
 * @param {string} rowKey - Booking row key (Stripe session ID)
 * @param {string} paymentIntentId - Stripe payment intent ID (optional)
 * @param {string} paymentMethod - Payment method (always 'stripe' for this system)
 * @returns {Promise<Object>} Updated entity
 */
async function markBalancePaid(rowKey, paymentIntentId, paymentMethod = 'stripe') {
  const client = getBookingsClient();
  
  try {
    // Get existing entity
    const entity = await client.getEntity('booking', rowKey);
    
    // Check if already paid (idempotency)
    if (entity.balancePaid === true) {
      console.log(`ℹ️ Balance already marked as paid for ${rowKey}`);
      return entity;
    }
    
    // Update with payment info
    entity.balancePaid = true;
    entity.balancePaidAt = new Date().toISOString();
    entity.balancePaymentIntentId = paymentIntentId || '';
    entity.balancePaymentMethod = paymentMethod || '';
    
    await client.updateEntity(entity, 'Merge');
    console.log(`✅ Marked balance as paid for ${rowKey} via ${paymentMethod}`);
    
    return entity;
  } catch (error) {
    console.error(`❌ Failed to mark balance paid in Azure:`, error.message);
    throw error;
  }
}

module.exports = {
  saveBookingToAzure,
  getBookingsNeedingReminders,
  markReminderSent,
  markBalancePaid,
};
