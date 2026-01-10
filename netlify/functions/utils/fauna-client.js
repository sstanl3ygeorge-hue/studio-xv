// FaunaDB client setup for booking management
const faunadb = require('faunadb');
const q = faunadb.query;

let client = null;

function getClient() {
  if (!client) {
    client = new faunadb.Client({
      secret: process.env.FAUNA_SECRET_KEY,
      domain: 'db.fauna.com',
      scheme: 'https',
    });
  }
  return client;
}

/**
 * Create a new booking record
 */
async function createBooking(bookingData) {
  const client = getClient();
  
  try {
    const result = await client.query(
      q.Create(q.Collection('bookings'), {
        data: {
          ...bookingData,
          createdAt: q.Now(),
          reminder24hSent: false,
          reminder2hSent: false,
          balanceReminderSent: false,
        }
      })
    );
    
    return result.data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

/**
 * Get bookings that need reminders
 */
async function getBookingsNeedingReminders() {
  const client = getClient();
  
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Get all bookings with upcoming sessions
    const result = await client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('bookings_by_session_time'))),
        q.Lambda('ref', q.Get(q.Var('ref')))
      )
    );
    
    const bookings = result.data.map(doc => ({
      id: doc.ref.id,
      ...doc.data
    }));
    
    // Filter in memory for reminders needed
    return bookings.filter(booking => {
      if (!booking.sessionDateTime) return false;
      
      const sessionTime = new Date(booking.sessionDateTime);
      const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
      
      // Check if 24h reminder needed (between 23.75 and 24.25 hours)
      const needs24h = !booking.reminder24hSent && 
                       hoursUntilSession >= 23.75 && 
                       hoursUntilSession <= 24.25;
      
      // Check if 2h reminder needed (between 1.75 and 2.25 hours)
      const needs2h = !booking.reminder2hSent && 
                      hoursUntilSession >= 1.75 && 
                      hoursUntilSession <= 2.25;
      
      // Check if balance reminder needed (24h before and balance > 0)
      const needsBalance = !booking.balanceReminderSent && 
                           booking.balanceDue > 0 && 
                           hoursUntilSession >= 23.75 && 
                           hoursUntilSession <= 24.25;
      
      if (needs24h || needs2h || needsBalance) {
        booking._needs24h = needs24h;
        booking._needs2h = needs2h;
        booking._needsBalance = needsBalance;
        return true;
      }
      
      return false;
    });
  } catch (error) {
    console.error('Error getting bookings for reminders:', error);
    throw error;
  }
}

/**
 * Mark reminder as sent
 */
async function markReminderSent(bookingId, reminderType) {
  const client = getClient();
  
  try {
    const updateData = {};
    
    if (reminderType === '24h') {
      updateData.reminder24hSent = true;
      updateData.reminder24hSentAt = new Date().toISOString();
    } else if (reminderType === '2h') {
      updateData.reminder2hSent = true;
      updateData.reminder2hSentAt = new Date().toISOString();
    } else if (reminderType === 'balance') {
      updateData.balanceReminderSent = true;
      updateData.balanceReminderSentAt = new Date().toISOString();
    }
    
    const result = await client.query(
      q.Update(q.Ref(q.Collection('bookings'), bookingId), {
        data: updateData
      })
    );
    
    return result.data;
  } catch (error) {
    console.error('Error marking reminder sent:', error);
    throw error;
  }
}

/**
 * Get booking by Stripe session ID
 */
async function getBookingByStripeSession(stripeSessionId) {
  const client = getClient();
  
  try {
    const result = await client.query(
      q.Get(q.Match(q.Index('bookings_by_stripe_session'), stripeSessionId))
    );
    
    return {
      id: result.ref.id,
      ...result.data
    };
  } catch (error) {
    if (error.name === 'NotFound') {
      return null;
    }
    console.error('Error getting booking by Stripe session:', error);
    throw error;
  }
}

module.exports = {
  createBooking,
  getBookingsNeedingReminders,
  markReminderSent,
  getBookingByStripeSession,
};
