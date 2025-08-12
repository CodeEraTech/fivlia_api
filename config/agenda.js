const Agenda = require('agenda');

let agenda;

const initAgenda = async (mongoConnection) => {
  agenda = new Agenda().mongo(mongoConnection, 'agendaJobs'); // 👈 Use existing connection + collection
  await agenda.start(); // 🚀 Start the worker
  return agenda;
};

module.exports = { initAgenda, getAgenda: () => agenda };
