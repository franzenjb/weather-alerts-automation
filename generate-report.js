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

  const prompt = `TODAY IS ${todayFormatted.toUpperCase()}. Generate a weather report for ${todayShort.toUpperCase()} through ${day5Short.toUpperCase()}.

AARC 5-Day Weather Risk Report Generator
TASK
Generate a detailed weather risk report for the next 5 days (${todayShort} through ${day5Short}) covering these states:
TN, MS, GA, AL, FL, NC, SC
Include USVI only if threat level is RED or ORANGE

SOURCE REQUIREMENTS
Use ONLY official sources: NWS, NOAA, SPC, WPC, NHC, FEMA, or state EMAs
NO seasonal commentary, historical context, speculation, or third-party sources
MUST check SPC Day 1-3 Convective Outlooks and Day 4-8 Fire Weather Outlooks
MUST check WPC excessive rainfall outlooks
MUST check NHC tropical outlooks

OUTPUT FORMAT
Produce ONE clean HTML block with inline CSS only
DO NOT include <html>, <body>, <head> tags or markdown formatting
NO content references, escape characters, previews, or explanations
DO NOT split into multiple responses
DO NOT minify or compress code
DO NOT output anything before or after the main <div> block

Specific Text Styling for Hazards:
MUST use <span style="font-weight:bold;">...</span> tags to bold key hazard terms such as "damaging winds (58+ mph)", "large hail", "small hail", "tornadoes possible", "flooding", etc. This applies when these terms appear in the "Primary Hazards" description for each threat AND if similar key hazard terms are mentioned in the "Recommendations" section (e.g., within <li> action items or general advice).

HTML STRUCTURE
The HTML must begin with:
<div style="background-color:#ffffff; font-family:Arial; color:#333333; font-size:16px; line-height:1.6; padding:24px; margin:0;"> And end with: </div>

CONTENT SECTIONS
Date Header:
<h2 style="color:#990000; font-weight:bold;">${todayShort} - ${day5Short}</h2>

Severe Weather Threats:
<h3 style="color:#990000; font-weight:bold;">Severe Weather Threats (5-Day Outlook)</h3>
Include ALL active threats ENHANCED, SLIGHT, MARGINAL or higher from SPC
For each threat, include:
Hazard name
Day/Timing
Affected Areas
Primary Hazards (Ensure key terms are bolded as per "Specific Text Styling for Hazards" above)
Readiness Level using:
<span style="color:#cc0000; font-weight:bold;">ENHANCED</span>
<span style="color:#e67300; font-weight:bold;">SLIGHT</span>
<span style="color:#ffcc00; font-weight:bold;">MARGINAL</span>
If no threats exist, use:
<p>There are no active severe weather threats in the covered regions over the next 5 days.</p>

Recommendations:
<h3 style="color:#990000; font-weight:bold;">Recommendations</h3> <h4 style="color:#990000; font-weight:bold;">Immediate Actions</h4> <ul> <li>[Action item - Ensure key hazard terms mentioned are bolded as per "Specific Text Styling for Hazards" above]</li> </ul> <h4 style="color:#990000; font-weight:bold;">5-Day Monitoring</h4> <ul> <li>[Monitoring item - Ensure key hazard terms mentioned are bolded as per "Specific Text Styling for Hazards" above]</li> </ul>

Attribution:
<p style="font-size:14px; color:#666;">Sources: NWS Storm Prediction Center, NOAA, FEMA, and state emergency management agencies.</p>

CRITICAL REQUIREMENT
NEVER ignore SPC categorical outlooks - ENHANCED, SLIGHT, and MARGINAL risks are ALL significant for emergency management operations and MUST be included.`;

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
