/**
 * Create Outlook calendar event using Microsoft Graph API
 */

const { getGraphToken } = require('./graph-auth');

async function createCalendarEvent({ 
  customerName, 
  customerEmail, 
  service, 
  sessionDate, 
  sessionTime, 
  hours, 
  total, 
  deposit,
  durationLabel  // 🆕 Smart display label
}) {
  // 📊 LOG CALENDAR DATA (as requested)
  console.log('📊 Calendar Event Data:', JSON.stringify({
    customer: customerName,
    email: customerEmail,
    service,
    date: sessionDate,
    time: sessionTime,
    durationLabel: durationLabel || `${hours} hour(s)`,
    payment: { total, deposit }
  }, null, 2));

  const accessToken = await getGraphToken();
  const userEmail = process.env.MICROSOFT_USER_EMAIL;

  if (!userEmail) {
    throw new Error('MICROSOFT_USER_EMAIL environment variable is not set');
  }

  // Determine duration (minimum 2 hours for recording sessions)
  let duration = hours || 1;
  if (service.toLowerCase().includes('recording') && duration < 2) {
    duration = 2;
  }

  // Handle date with proper ISO parsing
  let startDateTime;
  let endDateTime;
  let subjectPrefix = '';

  if (sessionDate && sessionTime) {
    try {
      // Parse session date - handle both ISO (YYYY-MM-DD) and DD/MM/YYYY formats
      let year, month, day;
      if (sessionDate.includes('-')) {
        // ISO format: YYYY-MM-DD
        [year, month, day] = sessionDate.split('-').map(Number);
      } else {
        // DD/MM/YYYY format
        [day, month, year] = sessionDate.split('/').map(Number);
      }
      
      // Parse time (HH:mm)
      const [hour, minute] = sessionTime.split(':').map(Number);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
        throw new Error(`Invalid date/time values: ${sessionDate} ${sessionTime}`);
      }
      
      // Build ISO datetime string (month is 1-indexed in YYYY-MM-DD format)
      const isoDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      
      startDateTime = new Date(isoDateString);
      
      // Validate the date object
      if (isNaN(startDateTime.getTime())) {
        throw new Error(`Invalid Date object created from: ${isoDateString}`);
      }
      
      endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + duration);
      
      console.log(`✅ Calendar datetime parsed: ${startDateTime.toISOString()}`);
    } catch (dateError) {
      // If date parsing fails, log warning and create placeholder event
      console.warn(`⚠️ Failed to parse session date/time: ${dateError.message}`);
      console.warn(`  Session date: ${sessionDate}, Session time: ${sessionTime}`);
      subjectPrefix = '[DATE PARSE ERROR] ';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      startDateTime = tomorrow;
      endDateTime = new Date(tomorrow);
      endDateTime.setHours(endDateTime.getHours() + duration);
    }
  } else {
    // No date provided - create placeholder for tomorrow
    subjectPrefix = '[DATE TBC] ';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // Default to 10 AM
    
    startDateTime = tomorrow;
    endDateTime = new Date(tomorrow);
    endDateTime.setHours(endDateTime.getHours() + duration);
  }

  const eventPayload = {
    subject: `${subjectPrefix}Studio XV — ${service} Session — ${customerName}`,
    body: {
      contentType: 'Text',
      content: `Booking Details:

Customer: ${customerName}
Email: ${customerEmail}
Service: ${service}
Duration: ${duration} hour(s)
Total: £${total}
Deposit Paid: £${deposit}
Balance Due: £${total - deposit}

${sessionDate && sessionTime ? `Session: ${sessionDate} at ${sessionTime}` : 'Date to be confirmed with customer'}`
    },
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Europe/London'
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Europe/London'
    },
    attendees: [
      {
        emailAddress: {
          address: userEmail,
          name: 'Studio XV'
        },
        type: 'required'
      }
    ],
    isReminderOn: true,
    reminderMinutesBeforeStart: 1440 // 24 hours
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userEmail}/calendar/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    }
  );

  console.log(`Graph calendar event response status: ${response.status}`);

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Failed to create calendar event (${response.status}):`, error);
    throw new Error(`Failed to create calendar event (${response.status}): ${error}`);
  }

  const event = await response.json();
  console.log(`✅ Calendar event created successfully (ID: ${event.id})`);
  return event;
}

module.exports = { createCalendarEvent };
