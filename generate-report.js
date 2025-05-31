const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs').promises;

async function generateWeatherReport() {
  // Generate current date and 5-day range dynamically
  const today = new Date();
  const day5 = new Date(today);
  day5.setDate(today.getDate() + 4);
  
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

  const prompt = `You are generating a weather report for emergency management. 

CRITICAL: Today is ${todayFormatted} and you must generate a report for the 5-day period from ${todayShort} through ${day5Short}. Do not use any other dates.

Create an HTML weather risk report with these EXACT dates: ${todayShort} - ${day5Short}

Generate current, real-time weather data for these southeastern US states: TN, MS, GA, AL, FL, NC, SC`;

  try {
    // Call Claude API
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    const htmlContent = response.data.content[0].text;
    
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
        ${htmlContent}
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
        ${htmlContent}
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
