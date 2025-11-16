import type { Mailer } from "../../lib/mailer";
import type { TestContext } from "./testContext";

export interface CapturedOtp {
  to: string;
  code: string;
  issuedAt: Date;
  namespace: string;
}

const capturedOtps: CapturedOtp[] = [];

export function createTestMailer(context: TestContext): Mailer {
  return {
    async sendOtpEmail({ to, code }) {
      capturedOtps.push({
        to,
        code,
        issuedAt: new Date(),
        namespace: context.namespace,
      });
    },
  };
}

export function clearCapturedOtps() {
  capturedOtps.length = 0;
}

export function findLatestOtpFor(email: string) {
  for (let i = capturedOtps.length - 1; i >= 0; i -= 1) {
    const otp = capturedOtps[i];
    if (otp.to === email) {
      return otp;
    }
  }
  return null;
}
