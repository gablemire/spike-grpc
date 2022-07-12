const {
  Client,
  credentials,
  Metadata,
  makeGenericClientConstructor,
} = require("@grpc/grpc-js");
const { promisify } = require("node:util");
const { randomUUID } = require("node:crypto");
const { grpctest } = require("./generated/grpc-test");

function waitForClientReady(client) {
  return new Promise((resolve, reject) => {
    const deadline = new Date().getTime() + 5000;
    client.waitForReady(deadline, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  const client = new Client("127.0.0.1:5551", credentials.createInsecure());

  try {
    await waitForClientReady(client);

    console.log("Client is ready");

    const service = grpctest.GrpcTest.create((method, data, callback) => {
      console.log("Service method", method.name);

      const metadata = new Metadata({
        cacheableRequest: true,
        idempotentRequest: true,
        waitForReady: true,
      });
      metadata.add("RequestId", randomUUID());

      client.makeUnaryRequest(
        `/grpctest.${grpctest.GrpcTest.name}/${method.name}`,
        (v) => v,
        (v) => v,
        data,
        metadata,
        {},
        (err, response) => {
          callback(err, response);
        }
      );
    });

    const response = await service.msg({
      server: "Potato",
    });

    console.log("Received response", response);
  } finally {
    client.close();
    console.log("Client closed");
  }
}

main()
  .then(() => console.log("Done"))
  .catch((err) => {
    console.error("An error occurred", err);

    process.exit(1);
  });
