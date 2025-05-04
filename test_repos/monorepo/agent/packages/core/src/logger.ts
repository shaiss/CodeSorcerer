import pino, { type LogFn } from "pino";
import pretty from "pino-pretty";
import fs from "fs";
import path from "path";

import { parseBooleanFromText } from "./parsing.ts";

const customLevels: Record<string, number> = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    log: 29,
    progress: 28,
    success: 27,
    workflow: 25,
    debug: 20,
    trace: 10,
};

const raw = parseBooleanFromText(process?.env?.LOG_JSON_FORMAT) || false;

const createStream = () => {
    if (raw) {
        return undefined;
    }
    return pretty({
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
    });
};

const defaultLevel = process?.env?.DEFAULT_LOG_LEVEL || "info";

const options = {
    level: defaultLevel,
    customLevels,
    hooks: {
        logMethod(
            inputArgs: [string | Record<string, unknown>, ...unknown[]],
            method: LogFn
        ): void {
            const [arg1, ...rest] = inputArgs;

            if (typeof arg1 === "object") {
                const messageParts = rest.map((arg) =>
                    typeof arg === "string" ? arg : JSON.stringify(arg)
                );
                const message = messageParts.join(" ");
                method.apply(this, [arg1, message]);
            } else {
                const context = {};
                const messageParts = [arg1, ...rest].map((arg) =>
                    typeof arg === "string" ? arg : arg
                );
                const message = messageParts
                    .filter((part) => typeof part === "string")
                    .join(" ");
                const jsonParts = messageParts.filter(
                    (part) => typeof part === "object"
                );

                Object.assign(context, ...jsonParts);

                method.apply(this, [context, message]);
            }
        },
    },
};

export const elizaLogger = pino(options, createStream());

// Adiciona função específica para workflow que escreve em arquivo
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const originalWorkflow = elizaLogger.workflow;
elizaLogger.workflow = (...args: Parameters<typeof originalWorkflow>) => {
    // Chama o logger original para manter o console
    originalWorkflow.apply(elizaLogger, args);

    // Escreve no arquivo de workflow
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toISOString().split('T')[1].split('.')[0];

    const logFile = path.join(logDir, `${date}.workflow.log`);

    // Extrai apenas a mensagem do objeto
    let message = '';
    if (typeof args[0] === 'string') {
        message = args.join(' ');
    } else {
        const obj = args[0] as Record<string, any>;
        if (obj.msg) {
            try {
                const msgObj = JSON.parse(obj.msg);
                message = msgObj.content?.text || obj.msg;
            } catch {
                message = obj.msg;
            }
        } else {
            message = JSON.stringify(obj);
        }
    }

    const logMessage = `${date} ${time} - ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
};

export default elizaLogger;
