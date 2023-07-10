const { createCanvas } = require("canvas");

// exports.handler = async (event) => {
exports.handler = async (event, context) => {
    try{
      // Extract the parameters from the event
      let statusPoints = JSON.parse(event.queryStringParameters.statusPoints || "[]");
      // Create an array of phases, removing duplicates
      const phases = [...new Set(statusPoints.map(point => point.phase))];
      // const statusLabels = event.queryStringParameters.statusLabels;
      const imageWidth = parseInt(event.queryStringParameters.imageWidth);
      const imageHeight = parseInt(event.queryStringParameters.imageHeight);
      // const updatedDate = event.queryStringParameters.updatedDate;
      const updatedDate = new Date().toISOString();
      // const phases = JSON.parse(event.queryStringParameters.phases);

      // Sort the statusPoints by timestamp
      statusPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Use the provided startTime and endTime, or default to the earliest and latest statusPoint
      const startTime = new Date(event.queryStringParameters.startTime || statusPoints[0].timestamp);
      const endTime = new Date(event.queryStringParameters.endTime || statusPoints[statusPoints.length - 1].timestamp);

      // Check if the last status point's timestamp is equal to endTime. If not, add a new status point
      if(new Date(statusPoints[statusPoints.length - 1].timestamp).getTime() !== endTime.getTime()){
        statusPoints.push({
          timestamp: endTime.toISOString(),
          phase: statusPoints[statusPoints.length - 1].phase,
          status: statusPoints[statusPoints.length - 1].status
        });
      }
      // Create the canvas with the specified dimension
      const canvas = createCanvas(imageWidth, imageHeight);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false; // Disable image smoothing
      // Set the background color
      ctx.fillStyle = '#fff';  // Replace '#000000' with your desired color
      ctx.fillRect(0, 0, canvas.width, canvas.height);  // This will fill the entire canvas with the color
      // Add these lines after you get the context from the canvas
      ctx.strokeStyle = 'purple';  // Sets the color of the line to black
      ctx.fillStyle = 'red';  // Sets the color of the text to black
      const padding = 110;  // adjust this value to your needs
      const paddingTop = 50;  // adjust this value to your needs
      const paddingBottom = 50;  // adjust this value to your needs
      const paddingLeft = 110;  // adjust this value to your needs
      const paddingRight = 50;  // adjust this value to your needs
      // const phaseRowHeight = (imageHeight - 2 * padding) / phases.length;
      const phaseRowHeight = (imageHeight - paddingTop - paddingBottom) / phases.length;

// Draw alternating colored rows for phases
      for (let i = 0; i < phases.length; i++) {
        // const y = i * phaseRowHeight + padding;
        const y = i * phaseRowHeight + paddingTop;

        // Set the color for the row
        ctx.fillStyle = i % 2 === 0 ? '#EEEEEE' : '#FFFFFF';  // Choose the color based on whether the row number is even or odd

        // Draw the row
        ctx.fillRect(paddingLeft, y, imageWidth - paddingLeft - paddingRight, phaseRowHeight);
      }


      const phaseToY = phase => (phases.indexOf(phase)) * phaseRowHeight + paddingTop + phaseRowHeight / 2;
// Define how to convert a timestamp to an x-coordinate
      const totalDuration = endTime - startTime;
      const xOffset = 15; // The offset from the edge of the canvas
      // const timestampToX = timestamp => ((new Date(timestamp) - startTime) / totalDuration * (imageWidth - 2 * padding - xOffset)) + padding;
      const timestampToX = timestamp => ((new Date(timestamp) - startTime) / totalDuration * (imageWidth - paddingLeft - paddingRight - xOffset)) + paddingLeft;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Determine the best interval for the tick marks
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;  // Approximate
      const oneYear = 365 * oneDay;  // Approximate

      let tickInterval;
      let tickFormat;

      if (totalDuration <= oneDay) {
        tickInterval = oneHour;
        tickFormat = date => date.toISOString().split('T')[1].slice(0, 5);  // The label is the time in 'hh:mm' format
      } else if (totalDuration <= oneWeek) {
        tickInterval = oneDay;
        tickFormat = date => date.toISOString().split('T')[0];  // The label is the date in 'yyyy-mm-dd' format
      } else if (totalDuration <= oneMonth) {
        tickInterval = oneWeek;
        tickFormat = date => `${months[date.getUTCMonth()]} ${date.getUTCDate()} '${date.getUTCFullYear().toString().slice(-2)}`;  // Modified format
      } else if (totalDuration <= oneYear) {
        tickInterval = oneMonth;
        tickFormat = date => {
          return `${months[date.getUTCMonth()]} ${date.getUTCDate()} '${date.getUTCFullYear().toString().slice(-2)}`;  // Modified format
        };
      } else {
        tickInterval = oneYear;
        tickFormat = date => date.getUTCFullYear().toString();  // The label is the year in 'yyyy' format
      }

// Determine the starting time for the tick marks
      const firstEventTime = new Date(statusPoints[0].timestamp);
      // Draw tick marks at the determined interval
      const tolerance = 1000 * 60 * 5;  // 5 minutes tolerance
      let lastTickTime = +firstEventTime;
      const minorGridlineSpacing = 1 / 16; // Adjust the spacing as needed

      for (let time = +firstEventTime; time <= +endTime + tolerance; time += tickInterval) {
        if (time > +endTime) {
          time = +endTime;
        }
        const x = timestampToX(new Date(time));

        // Draw vertical gridline
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, imageHeight - paddingBottom);
        ctx.strokeStyle = 'green'; // light grey
        ctx.stroke();

        // Add a label for the tick mark
        let text = tickFormat(new Date(time));
        if (text !== '') {
          ctx.font = "18px Arial";  // Set the font size to 20 pixels
          let textWidth = ctx.measureText(text).width;
          ctx.fillStyle = 'white'; // Set a contrasting color for the text background
          ctx.fillStyle = 'black'; // Set the text color
          ctx.fillText(text, x - textWidth / 2 -5, imageHeight - paddingBottom + 20);
        }

        if (time === +endTime) {
          break;
        }
        lastTickTime = time;
      }

// If the last tick that was added is not equal to the endTime, add a tick for the endTime
      if (lastTickTime !== +endTime) {
        const x = timestampToX(new Date(endTime));
        const labelOffsetY = -40;  // Adjust this value to set the vertical offset
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, imageHeight - paddingBottom +20);
        ctx.strokeStyle = 'grey'; // light grey
        ctx.stroke();

        // Add a label for the tick mark
        let text = tickFormat(new Date(endTime));
        ctx.font = "18px Arial";  // Set the font size to 20 pixels
        let textWidth = ctx.measureText(text).width;
        ctx.fillText(text, x - textWidth / 2, imageHeight - paddingBottom - labelOffsetY);  // Subtract the labelOffsetY from the y-coordinate
      }

// Add an array of colors
      const colors = ['#f2a09c',  '#e9d8ab', '#a6ec95', '#97eadb', '#94d0f2', '#f6c99f', '#cab2e1'];


// Draw the line
      for (let i = 0; i < statusPoints.length - 1; i++) {
        const x1 = timestampToX(statusPoints[i].timestamp);
        const y1 = phaseToY(statusPoints[i].phase);
        const x2 = i < statusPoints.length - 1 ? timestampToX(statusPoints[i + 1].timestamp) : timestampToX(endTime);
        const y2 = i < statusPoints.length - 1 ? phaseToY(statusPoints[i + 1].phase) : phaseToY(statusPoints[i].phase);

        // Set the color for the horizontal line
        ctx.strokeStyle = colors[phases.indexOf(statusPoints[i].phase)];

        // Set the line width for the horizontal line
        ctx.lineWidth = 60;  // Adjust the width as needed

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.stroke();

        // Reset the line width for the vertical lines
        ctx.lineWidth = .25;  // Adjust the width as needed

        // Set the color for the vertical line
        ctx.strokeStyle = 'purple'; // Set the color back to black

      }

// Variables to hold the previous timestamp and phase
      let prevTimestamp = null;
      let prevPhase = null;

// Draw the line
      for (let i = 0; i < statusPoints.length; i++) {
        const x1 = timestampToX(statusPoints[i].timestamp);
        const y1 = phaseToY(statusPoints[i].phase);
        let x2, y2, days;

        if (i < statusPoints.length - 1) {
          x2 = timestampToX(statusPoints[i + 1].timestamp);
          y2 = phaseToY(statusPoints[i + 1].phase);
          days = Math.floor((new Date(statusPoints[i + 1].timestamp) - new Date(statusPoints[i].timestamp)) / (1000 * 60 * 60 * 24));
        } else {
          x2 = timestampToX(endTime);
          y2 = y1;
          days = Math.floor((endTime - new Date(statusPoints[i].timestamp)) / (1000 * 60 * 60 * 24));
        }

        // Set the color for the horizontal line
        ctx.strokeStyle = colors[phases.indexOf(statusPoints[i].phase)];

        // Set the line width for the horizontal line
        ctx.lineWidth = 60;  // Adjust the width as needed

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.stroke();

        // Reset the line width for the vertical lines
        ctx.lineWidth = .25;  // Adjust the width as needed
        if (days > 0) { // only draw the days if it's greater than 0
          // Calculate the number of days
          const daysText = `${days}d`;

          // Get the middle x position
          const midX = (x1 + x2) / 2;

          // Get the width of the text
          const textWidth = ctx.measureText(daysText).width;

          // Draw the number of days above the stepped line
          ctx.fillText(daysText, midX - textWidth / 2, y1 + 5);
        }
      }



// Label the phases
      ctx.textBaseline = 'middle';  // Center the text vertically
      let labelPadding = 2; // Adjust this value to create more space for labels
      for (let i = 0; i < phases.length; i++) {
        const y = phaseToY(phases[i]);

        // Set the color for phase label
        ctx.fillStyle = 'black';

        // Set the text alignment to end, so the text ends at the specified x-coordinate
        ctx.textAlign = 'end';

        // Draw phase label at the left edge of the canvas
        // ctx.fillText(phases[i], padding - labelPadding, y);
        ctx.fillText(phases[i], paddingLeft - labelPadding, y);
      }


// Convert the updatedDate to a Date object
      const updatedDateObj = new Date(updatedDate);

// Format the date as "Month day year time AM/PM"
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
      const updatedDateText = `Updated: ${updatedDateObj.toLocaleString('en-US', options)}`;

      ctx.font = '18px Arial';  // Adjust the size as needed
      ctx.fillStyle = 'red';  // Black color
      ctx.fillText(updatedDateText, imageWidth - 50, paddingTop - 10);  // Position the updated date in the bottom right

      // Convert the canvas to an image buffer
      const imageBuffer = canvas.toBuffer();

      // Convert the buffer to a base64 string
      const imageBase64 = imageBuffer.toString('base64');

      // Return the base64 image as the body, with the appropriate headers for an image
      // Return the successful response
      return {
        statusCode: 200,
        headers: { "Content-Type": "image/png" },
        body: imageBase64,
        isBase64Encoded: true,
      };
    } catch (error) {
      // Handle the error
      console.error("An error occurred:", error);

      // Return an error response
      return {
        statusCode: 500,
        body: "Internal Server Error",
      };
    }
  };