import "server-only";
import amqp from "amqplib";
// UTILS
import { env } from "@/env.js";
// TYPES

/**
 * Publishes a message to a RabbitMQ queue.
 */
export const publishToQueue = async ({
  queueName,
  message,
}: {
  queueName: string;
  message: string;
}): Promise<boolean> => {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(env.RABBITMQ_URL, { tls: { rejectUnauthorized: false, }, });
    const channel = await connection.createChannel();

    // Assert the queue
    await channel.assertQueue(queueName, { durable: true });

    // Publish the message
    const isSent = channel.sendToQueue(queueName, Buffer.from(message), {
      persistent: true,
    });

    console.log(
      `Task published to RabbitMQ for message: ${JSON.stringify(message)}`,
    );

    // Close RabbitMQ connection after a short delay
    setTimeout(() => {
      void channel.close();
      void connection.close();
    }, 500);

    return isSent; // Returns true if the message was sent successfully
  } catch (error) {
    console.error(
      `Failed to publish message to queue: ${(error as Error).message}`,
    );
    return false;
  }
};
