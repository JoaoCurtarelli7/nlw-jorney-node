import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { getMainClient } from "../lib/mail";
import nodemailer from "nodemailer";
import { ClientError } from "../error/client-error";
import { env } from "../env";

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips/:tripId/invites",
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          email: z.string().email(),
        }),
      },
    },

    async (req) => {
      const { email } = req.body;
      const { tripId } = req.params;

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
      });

      if (!trip) {
        throw new ClientError("Trip not found");
      }

      const participant = await prisma.participant.create({
        data: {
          email,
          trip_id: tripId,
        },
      });

      const formattedStartsAt = dayjs(trip.starts_at).format("LL");
      const formattedEndsAt = dayjs(trip.ends_at).format("LL");

      const mail = await getMainClient();

      const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`;

      const message = await mail.sendMail({
        from: {
          name: "Trip Planner",
          address: "oi@email.com",
        },
        to: participant.email,
        subject: `Confirme sua presença na para ${trip.destination} em ${formattedStartsAt}!`,
        html: `
              <div style="font-family: sans-serif;font-size: 16px;line-height: 1.6;">
                <p> Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong>, Brasil nas datas de <strong>${formattedStartsAt}</strong> até  <strong>${formattedEndsAt}</strong>.</p>
                <p></p>
                <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
                <p></p>
                <p>
                  <a href="${confirmationLink}">Confirmar viagem</a>
                </p>
                <p></p>
                <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
              </div>
    
            `.trim(),
      });

      console.log(nodemailer.getTestMessageUrl(message));

      return { participantId: participant.id };
    }
  );
}
