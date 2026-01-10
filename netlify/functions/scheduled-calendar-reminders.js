exports.handler = async (event, context) => {
  console.log('Running calendar reminder check...');

  try {
    // Get Microsoft Graph access token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // Calculate tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const startDateTime = tomorrow.toISOString();
    const endDateTime = endOfTomorrow.toISOString();

    // Get calendar events for tomorrow
    const userEmail = process.env.MICROSOFT_USER_EMAIL;
    const calendarResponse = await fetch(
      `https://graph.microsoft.com/v1.0/users/${userEmail}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const calendarData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      throw new Error(`Calendar error: ${JSON.stringify(calendarData)}`);
    }

    const events = calendarData.value || [];
    console.log(`Found ${events.length} events tomorrow`);

    // Send reminder for each event
    const remindersSent = [];
    
    for (const event of events) {
      // Extract customer email from event
      // Expected format: Email in description or attendee email
      let customerEmail = null;
      let customerName = null;
      let service = 'Session';
      let balance = 0;

      // Try to get email from attendees
      if (event.attendees && event.attendees.length > 0) {
        const attendee = event.attendees.find(a => 
          a.emailAddress.address !== process.env.MICROSOFT_USER_EMAIL
        );
        if (attendee) {
          customerEmail = attendee.emailAddress.address;
          customerName = attendee.emailAddress.name;
        }
      }

      // Try to extract from description (format: Email: customer@example.com)
      if (!customerEmail && event.bodyPreview) {
        const emailMatch = event.bodyPreview.match(/Email:\s*([^\s]+@[^\s]+)/i);
        if (emailMatch) {
          customerEmail = emailMatch[1];
        }
        
        const nameMatch = event.bodyPreview.match(/Name:\s*([^\n]+)/i);
        if (nameMatch) {
          customerName = nameMatch[1].trim();
        }

        const serviceMatch = event.bodyPreview.match(/Service:\s*([^\n]+)/i);
        if (serviceMatch) {
          service = serviceMatch[1].trim();
        }

        const balanceMatch = event.bodyPreview.match(/Balance:\s*£?(\d+)/i);
        if (balanceMatch) {
          balance = parseInt(balanceMatch[1]);
        }
      }

      if (!customerEmail) {
        console.log(`No customer email found for event: ${event.subject}`);
        continue;
      }

      // Calculate session duration in hours
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      const hours = Math.round((endTime - startTime) / (1000 * 60 * 60));

      // Format date and time
      const sessionDate = startTime.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const sessionTime = startTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Send reminder email
      try {
        const emailResponse = await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sessionReminder',
            to: customerEmail,
            data: {
              customerName: customerName || 'there',
              service: service,
              date: sessionDate,
              time: sessionTime,
              hours: hours,
              balance: balance
            }
          })
        });

        if (emailResponse.ok) {
          console.log(`Reminder sent to ${customerEmail} for ${event.subject}`);
          remindersSent.push({
            event: event.subject,
            email: customerEmail,
            time: sessionTime
          });
        } else {
          console.error(`Failed to send reminder to ${customerEmail}`);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${customerEmail}:`, emailError);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Checked calendar and sent ${remindersSent.length} reminders`,
        reminders: remindersSent
      })
    };

  } catch (error) {
    console.error('Calendar reminder error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
