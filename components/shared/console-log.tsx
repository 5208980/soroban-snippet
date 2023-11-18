"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
// import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus'
import coy from 'react-syntax-highlighter/dist/esm/styles/prism/coy'
import { CodeBlock } from './code-block';

export interface ConsoleLogProps
    extends React.HTMLAttributes<HTMLDivElement> {
    language?: string;
}

const ConsoleLogRef = ({ language }: ConsoleLogProps, ref: any) => {
    const [consoleLog, setConsoleLog] = useState<string>("");
    const clearConsole = () => {
        setConsoleLog("");
    };
    const appendConsole = (newLog: string) => {
        setConsoleLog(prevLog => prevLog + newLog + '\n');
    };

    useImperativeHandle(ref, () => ({
        clearConsole,
        appendConsole,
    }));

    return (
        <CodeBlock language={language || "bash"} code={consoleLog} theme={coy} />
    )
}

export const ConsoleLog = forwardRef(ConsoleLogRef);
