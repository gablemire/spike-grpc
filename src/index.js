const {
  Client,
  credentials,
  Metadata,
  makeGenericClientConstructor,
} = require("@grpc/grpc-js");
const { promisify } = require("node:util");
const { randomUUID } = require("node:crypto");
const { grpctest } = require("./generated/grpc-test");

function serializeRequest(request, RequestType) {
  const validationErrors = RequestType.verify(request);
  if (!!validationErrors) {
    throw new Error(
      `${RequestType.name} validation error: ${validationErrors}`
    );
  }

  return RequestType.encode(request).finish();
}

function deserializeResponse(responseData, ResponseType) {
  const message = ResponseType.decode(responseData);
  return message.toJSON();
}

function msg(client, request) {
  return new Promise((resolve, reject) => {
    const metadata = new Metadata({
      cacheableRequest: true,
      idempotentRequest: true,
      waitForReady: true,
    });
    metadata.add("RequestId", randomUUID());

    client.makeUnaryRequest(
      `/grpctest.GrpcTest/Msg`,
      (request) => serializeRequest(request, grpctest.MsgRequest),
      (response) => deserializeResponse(response, grpctest.MsgReply),
      {
        server: "Toto",
      },
      metadata,
      {},
      (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      }
    );
  });
}

async function main() {
  const client = new Client("127.0.0.1:5551", credentials.createInsecure());

  try {
    console.log("Client is ready");

    const response = await msg(client, {
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
