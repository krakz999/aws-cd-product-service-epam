import { APIGatewayTokenAuthorizerEvent } from "aws-lambda";

export default async function (event: APIGatewayTokenAuthorizerEvent) {
  console.log("basicAuthorizer", event);
  const { authorizationToken } = event;

  try {
    if (!authorizationToken) {
      throw new Error("Unauthorized");
    }

    const token = authorizationToken.split(" ")[1];
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [username, password] = decoded.split(":");

    const expectedPassword = process.env[username];

    if (!expectedPassword || expectedPassword !== password) {
      throw new Error("Forbidden");
    }

    return {
      principalId: username,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
      context: {
        username,
      },
    };
  } catch (error) {
    console.error("Error in basicAuthorizer", error);
    throw new Error("Unauthorized");
  }
}
