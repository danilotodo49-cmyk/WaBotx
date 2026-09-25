const fs = require('fs');

module.exports = {
  botName: 'WaBotx',
  ownerName: 'Danilo',
  prefix: '.',
  officialGroup: 'https://chat.whatsapp.com/G9lidQKpoCI3JKJdbKCaO2',
  
  // Lee directo los JSON exactos que tú creaste en lib
  getMenu: () => JSON.parse(fs.readFileSync('./lib/menu.json', 'utf-8')),
  getMasInfo: () => JSON.parse(fs.readFileSync('./lib/masinfo.json', 'utf-8'))
};
