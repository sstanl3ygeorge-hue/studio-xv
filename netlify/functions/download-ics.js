// Generate and download ICS calendar file for Studio XV sessions
// Usage: /.netlify/functions/download-ics?title=...&start=...&end=...&desc=...&location=...

exports.handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract query parameters
    const params = event.queryStringParameters || {};
    const {
      title = 'Studio XV Session',
      start,
      end,
      desc = '',
      location = 'Studio XV, London, UK'
    } = params;

    // Validate required parameters
    if (!start || !end) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required parameters: start and end are required',
          example: '?title=Recording%20Session&start=2026-01-10T18:00:00.000Z&end=2026-01-10T22:00:00.000Z&desc=Mixing%20session&location=Studio%20XV'
        })
      };
    }

    // Parse and validate ISO date strings
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid date format. Use ISO 8601 format (e.g., 2026-01-10T18:00:00.000Z)'
        })
      };
    }

    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Generate unique ID for the event
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@studioxv.co.uk`;
    const timestamp = formatICSDate(new Date());

    // Escape special characters for ICS format
    const escapeICS = (text) => {
      if (!text) return '';
      return text
        .replace(/\\/g, '\\\\')   // Escape backslashes
        .replace(/;/g, '\\;')     // Escape semicolons
        .replace(/,/g, '\\,')     // Escape commas
        .replace(/\n/g, '\\n')    // Escape newlines
        .replace(/\r/g, '');      // Remove carriage returns
    };

    // Fold long lines (ICS spec: max 75 octets per line)
    const foldLine = (line) => {
      const maxLength = 75;
      if (line.length <= maxLength) return line;
      
      let folded = '';
      let remaining = line;
      
      while (remaining.length > maxLength) {
        folded += remaining.substring(0, maxLength) + '\r\n ';
        remaining = remaining.substring(maxLength);
      }
      folded += remaining;
      
      return folded;
    };

    // Build ICS content (RFC5545 compliant)
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio XV//Booking System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      foldLine(`SUMMARY:${escapeICS(title)}`),
      foldLine(`DESCRIPTION:${escapeICS(desc)}`),
      foldLine(`LOCATION:${escapeICS(location)}`),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Studio XV session tomorrow',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    // Join with CRLF (required by ICS spec)
    const icsContent = icsLines.join('\r\n') + '\r\n';

    // Return ICS file with download headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="studioxv-session.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: icsContent
    };

  } catch (error) {
    console.error('Error generating ICS file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate calendar file',
        message: error.message
      })
    };
  }
};
