import { SQSEvent } from "aws-lambda";

export default async function (event: SQSEvent) {
  console.log("catalogBatchProcess", event);
  console.log("Received message:", event.Records[0].body);
}
