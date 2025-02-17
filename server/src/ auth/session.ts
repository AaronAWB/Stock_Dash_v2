import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding'
import { prisma } from '../plugins/prisma'

export const generateSessionToken = () => {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes)
}

const SESSION_REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 15;
const SESSION_MAX_DURATION_MS = SESSION_REFRESH_INTERVAL_MS * 2;

export const sessionTokenToSessionID = (sessionToken: string) => {
    return encodeHexLowerCase(sha256(new TextEncoder().encode(sessionToken)));
}

export const createSession = async (sessionToken: string, userId: string) => {
    const sessionId = sessionTokenToSessionID(sessionToken)

    const session = {
        id: sessionId,
        userId,
        expiresAt: new Date(Date.now() + SESSION_MAX_DURATION_MS)
    };

    await prisma.session.create({
        data: session
    });

    return session
}

export const validateSession = async (sessionToken: string) => {
    const sessionId = sessionTokenToSessionID(sessionToken)

    const result = await prisma.session.findUnique({
        where: {
            id: sessionId
        },
        include: {
            user: true
        }
    });

    if (!result) {
        return { session: null, user: null}
    }

    const { user, ...session } = result;

    if (Date.now() >= session.expiresAt.getTime()) {
        await prisma.session.delete({
            where: {
                id: sessionId
            }
        });
    }

    return { user, session }
}

export const invalidateSession = async (sessionId: string) => {
    await prisma.session.delete({
        where: {
            id: sessionId
        }
    });
}