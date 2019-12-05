const cluster = require('cluster');
const { cpus } = require('os');

const Koa = require('koa');

const port = process.env.PORT || 8080;

if (cluster.isWorker) {
  const app = new Koa();
  app.use(async ctx => {
    ctx.body = 'Hello, world!';
  });
  app.on('error', e => console.error(e instanceof Error ? e.stack : e));
  app.listen(port);
  return;
}

async function clusterize() {
  let initialized = false;
  let onlineCount = 0;

  const cpusCount = cpus().length;
  console.log(`Clustering to ${cpusCount} CPUs...`);

  return new Promise((resolve, reject) => {
    try {
      cluster.on('online', worker => {
        console.log(`Worker ${worker.id} (pid ${worker.process.pid}) is started.`);
        onlineCount++;
        if (!initialized && onlineCount === cpusCount) {
          initialized = true;
          resolve();
        }
      });

      cluster.on('exit', (worker, code, signal) => {
        onlineCount--;
        console.log(`Worker ${worker.id} (pid ${worker.process.pid}) is finished, code ${code}, signal ${signal}.`);
        console.log('Starting new worker...');
        cluster.fork();
      });

      for (let i = 0; i < cpusCount; i++) {
        cluster.fork();
      }
    }
    catch (e) {
      console.error(e);
      reject('Unable to clusterize server.');
    }
  });
}

clusterize().then(() => console.log('Clusterized server is started.')).catch(e => console.error(e));
