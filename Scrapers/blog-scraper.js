const axios = require('axios');
const xpath = require('xpath');
const dom = require('xmldom').DOMParser;
const Papa = require('papaparse');
const fs = require('fs');

// Read the CSV file with the list of blog URLs
const inputFile = 'blogsList.csv';
const outputFile = 'scrapedBlogs.csv';

fs.readFile(inputFile, 'utf8', async (err, data) => {
  if (err) {
    return console.error('Error reading the CSV file:', err);
  }

  // Parse the CSV file
  Papa.parse(data, {
    header: true,
    complete: async (results) => {
      const urls = results.data.map(row => row.URL); // Assuming the URL column is named 'URL'
      const scrapedData = [];

      for (const url of urls) {
        try {
          // Fetch the HTML content of the blog
          const response = await axios.get(url);
          const doc = new dom().parseFromString(response.data);

          // Scrape the text using XPath
          const nodes = xpath.select("//div[@class='blog-rich-text']", doc); // Replace with the actual XPath of the target div

          // Extract the text content from the nodes
          const blogContent = nodes.map(node => node.textContent).join('\n').trim();

          // Save the URL and the scraped content
          scrapedData.push({ URL: url, Content: blogContent });
        } catch (error) {
          console.error('Error scraping the URL:', url, error);
        }
      }

      // Write the scraped data to a new CSV file
      const csv = Papa.unparse(scrapedData);
      fs.writeFile(outputFile, csv, 'utf8', (err) => {
        if (err) {
          console.error('Error writing the CSV file:', err);
        } else {
          console.log('Scraped data has been saved to', outputFile);
        }
      });
    }
  });
});