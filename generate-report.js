const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs').promises;

async function generateWeatherReport() {
  // Generate current date and 5-day range dynamically
  const today = new Date();
  const day5 = new Date(today);
  day5.setDate(today.getDate() + 4);
  
  // DEBUG: Log what JavaScript thinks the date is
  console.log('JavaScript thinks today is:', today.toString());
  console.log('JavaScript timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('JavaScript UTC date:', today.toISOString());
  
  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  const formatDateShort = (date) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  const todayFormatted = formatDate(today);
  const todayShort = formatDateShort(today);
  const day5Short = formatDateShort(day5);

  console.log('Formatted dates:', todayShort, 'through', day5Short);

  const prompt = `Generate current weather threat information for southeastern US states (TN, MS, GA, AL, FL, NC, SC).

Include any active weather risks like severe thunderstorms, tornadoes, flooding, high winds, or hail.
Format as: Day X: [Risk Level] [Areas] [Hazards] [Timing]

Do not include any dates - just day numbers (Day 1, Day 2, etc.) and weather information.
If no threats exist, state: "No significant weather threats."

Response should be plain text, no HTML.`;

  try {
    // Call OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a weather expert generating emergency management reports. Today is ${todayFormatted}. Always use current dates: ${todayShort} through ${day5Short}.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const weatherData = response.data.choices[0].message.content;
    
    console.log('Raw weather data from OpenAI:', weatherData);
    
    // Create the complete HTML with correct dates using JavaScript
    const correctedHtml = `<div style="background-color:#ffffff; font-family:Arial; color:#333333; font-size:16px; line-height:1.6; padding:24px; margin:0;">
<h2 style="color:#990000; font-weight:bold;">${todayShort} - ${day5Short}</h2>

<h3 style="color:#990000; font-weight:bold;">Severe Weather Threats (5-Day Outlook)</h3>

<div style="padding: 10px 0;">
${weatherData.replace(/Day (\d+)/g, (match, dayNum) => {
  const dayDate = new Date(today);
  dayDate.setDate(today.getDate() + (parseInt(dayNum) - 1));
  const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return `<strong>Day ${dayNum} (${dayName})</strong>`;
})}
</div>

<h3 style="color:#990000; font-weight:bold;">Recommendations</h3>
<h4 style="color:#990000; font-weight:bold;">Immediate Actions</h4>
<ul>
<li>Monitor local NWS forecasts and warnings for your specific area</li>
<li>Review emergency plans and communication procedures</li>
<li>Ensure emergency supplies are readily accessible</li>
<li>Stay informed of changing weather conditions</li>
</ul>

<h4 style="color:#990000; font-weight:bold;">5-Day Monitoring</h4>
<ul>
<li>Check weather updates twice daily</li>
<li>Monitor NWS warnings and watches</li>
<li>Be prepared to implement emergency procedures if conditions worsen</li>
<li>Keep communication devices charged and operational</li>
</ul>

<p style="font-size:14px; color:#666;">Sources: NWS Storm Prediction Center, NOAA, FEMA, and state emergency management agencies.</p>
</div>`;
    
    console.log('Generated HTML with correct dates');
    
    // Create output directory
    await fs.mkdir('./output', { recursive: true });
    
    // Save HTML for debugging
    await fs.writeFile('./output/weather-report.html', `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weather Alert</title>
      </head>
      <body style="margin:0; padding:0;">
        ${correctedHtml}
      </body>
      </html>
    `);

    // Generate PNG using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1800, deviceScaleFactor: 1.5 });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 30px; background: white; max-width: 1200px; }
        </style>
      </head>
      <body>
        ${correctedHtml}
      </body>
      </html>
    `, { waitUntil: 'networkidle0' });

    // Take screenshot
    await page.screenshot({
      path: './output/weather-alert.png',
      fullPage: true,
      type: 'png'
    });

    await browser.close();
    
    // Create index.html for GitHub Pages
    await fs.writeFile('./output/index.html', `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Weather Alert</title>
        <meta http-equiv="refresh" content="0; url=weather-alert.png">
      </head>
      <body>
        <p>Redirecting to weather alert image...</p>
        <img src="weather-alert.png" alt="Weather Alert" style="max-width: 100%;">
      </body>
      </html>
    `);

    console.log('Weather report generated successfully!');
    
  } catch (error) {
    console.error('Error generating weather report:', error.response?.data || error.message);
    process.exit(1);
  }
}

generateWeatherReport();
