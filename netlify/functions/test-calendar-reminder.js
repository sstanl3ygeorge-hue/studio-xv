exports.handler = async (event, context) => {
  console.log('Manual test of calendar reminder system...');

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

    const tokenText = await tokenResponse.text();
    console.log('Token response:', tokenText);
    
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      throw new Error(`Failed to parse token response: ${tokenText}`);
    }

    if (!tokenResponse.ok) {
      throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // Get tomorrow's date range
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

    const calendarText = await calendarResponse.text();
    console.log('Calendar response status:', calendarResponse.status);
    console.log('Calendar response:', calendarText);

    let calendarData;
    try {
      calendarData = JSON.parse(calendarText);
    } catch (e) {
      throw new Error(`Failed to parse calendar response (status ${calendarResponse.status}): ${calendarText}`);
    }

    if (!calendarResponse.ok) {
      throw new Error(`Calendar error: ${JSON.stringify(calendarData)}`);
    }

    const events = calendarData.value || [];
    console.log(`Found ${events.length} events tomorrow`);

    // Process each event and send reminders
    const results = [];
    
    for (const event of events) {
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

      // Try to extract from description
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
        results.push({
          event: event.subject,
          status: 'skipped',
          reason: 'No customer email found'
        });
        continue;
      }

      // Calculate session details
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      const hours = Math.round((endTime - startTime) / (1000 * 60 * 60));

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
          results.push({
            event: event.subject,
            status: 'sent',
            email: customerEmail,
            time: sessionTime
          });
        } else {
          const errorData = await emailResponse.json();
          results.push({
            event: event.subject,
            status: 'failed',
            email: customerEmail,
            error: errorData.error || 'Email failed'
          });
        }
      } catch (emailError) {
        results.push({
          event: event.subject,
          status: 'error',
          email: customerEmail,
          error: emailError.message
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Found ${events.length} events tomorrow`,
        remindersSent: results.filter(r => r.status === 'sent').length,
        results: results
      }, null, 2)
    };

  } catch (error) {
    console.error('Test error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }, null, 2)
    };
  }
};
