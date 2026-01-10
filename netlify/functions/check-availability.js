/**
 * Check calendar availability for a specific date
 * Queries bookings@studioxv.co.uk Outlook calendar via Microsoft Graph
 */

const { getGraphToken } = require('./utils/graph-auth');

exports.handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { date } = event.queryStringParameters || {};

    if (!date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Date parameter is required (format: YYYY-MM-DD)' })
      };
    }

    console.log(`📅 Checking availability for: ${date}`);

    // Get Microsoft Graph access token
    const accessToken = await getGraphToken();
    const userEmail = process.env.MICROSOFT_USER_EMAIL;

    if (!userEmail) {
      throw new Error('MICROSOFT_USER_EMAIL environment variable is not set');
    }

    // Parse the date and create start/end timestamps for the day (Europe/London timezone)
    const startDateTime = new Date(date + 'T00:00:00');
    const endDateTime = new Date(date + 'T23:59:59');

    // Query calendar for events on this date
    const calendarUrl = `https://graph.microsoft.com/v1.0/users/${userEmail}/calendar/calendarView?startDateTime=${startDateTime.toISOString()}&endDateTime=${endDateTime.toISOString()}`;
    
    console.log(`📊 Querying calendar: ${calendarUrl}`);

    const response = await fetch(calendarUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'outlook.timezone="Europe/London"'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Calendar query failed (${response.status}):`, error);
      throw new Error(`Failed to query calendar: ${error}`);
    }

    const data = await response.json();
    const events = data.value || [];

    console.log(`✅ Found ${events.length} events on ${date}`);

    // Extract occupied time slots
    const occupiedSlots = events.map(event => {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      
      return {
        subject: event.subject,
        start: start.toISOString(),
        end: end.toISOString(),
        startHour: start.getHours(),
        endHour: end.getHours(),
        startMinute: start.getMinutes(),
        endMinute: end.getMinutes()
      };
    });

    console.log('📍 Occupied slots:', JSON.stringify(occupiedSlots, null, 2));

    // Generate all possible time slots (09:00–22:00 in 1-hour increments)
    const allSlots = [];
    for (let hour = 9; hour <= 22; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      allSlots.push(timeString);
    }

    // Filter out occupied slots
    const availableSlots = allSlots.filter(slot => {
      const [hour] = slot.split(':').map(Number);
      
      // Check if this hour overlaps with any occupied slot
      const isOccupied = occupiedSlots.some(occupied => {
        // An hour slot is occupied if the event overlaps it at all
        const slotStart = hour;
        const slotEnd = hour + 1;
        
        // Event overlaps if: event starts before slot ends AND event ends after slot starts
        return (occupied.startHour < slotEnd && occupied.endHour > slotStart);
      });
      
      return !isOccupied;
    });

    console.log(`✅ Generated ${allSlots.length} total slots, ${availableSlots.length} available`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'ready',
        date,
        availableSlots,
        occupiedSlots,
        totalEvents: events.length
      })
    };

  } catch (error) {
    console.error('❌ Availability check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to check availability',
        message: error.message
      })
    };
  }
};
