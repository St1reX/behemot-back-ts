import path from 'path';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import { env, frontendUrl } from '../../config/env';

export type MailingTemplate = 'verify-account' | 'welcome';

interface SendMailParams {
    to: string | string[];
    subject: string;
    template: MailingTemplate;
    context: Record<string, unknown>;
    from?: string;
}

interface SendAccountVerificationMailParams {
    to: string;
    username: string;
    confirmationLink: string;
}

interface SendWelcomeMailParams {
    to: string;
    username: string;
}

const templatesPath = path.resolve(__dirname, 'templates');

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
        user: env.SMTP_LOGIN,
        pass: env.SMTP_PASSWORD,
    },
}) as hbs.HbsTransporter;

transporter.use(
    'compile',
    hbs({
        viewEngine: {
            extname: '.hbs',
            layoutsDir: templatesPath,
            partialsDir: templatesPath,
            defaultLayout: false,
        },
        viewPath: templatesPath,
        extName: '.hbs',
    }),
);

export class MailingService {
    static async sendMail({ from, ...mailData }: SendMailParams) {
        return transporter.sendMail({
            from: from ?? env.SMTP_LOGIN,
            ...mailData,
        });
    }

    static async sendAccountVerificationMail({
        to,
        username,
        confirmationLink,
    }: SendAccountVerificationMailParams) {
        return this.sendMail({
            to,
            subject: 'Potwierdź rejestrację konta',
            template: 'verify-account',
            context: {
                username,
                confirmationLink,
            },
        });
    }

    static async sendWelcomeMail({ to, username }: SendWelcomeMailParams) {
        return this.sendMail({
            to,
            subject: 'Witaj w Behemot',
            template: 'welcome',
            context: {
                username,
                applicationLink: frontendUrl,
            },
        });
    }
}
