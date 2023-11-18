"use client";

// import SyntaxHighlighter from "react-syntax-highlighter";
import ReactSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism';
import { atomOneDark, atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useEffect, useState } from "react";
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light'

export interface CodeBlockProps
    extends React.HTMLAttributes<HTMLDivElement> {
    code: string;
    theme?: any;
    language?: string;
}

export const CodeBlock = ({
    code,
    theme,
    language,
}: CodeBlockProps) => {
    const [codeStyle, setCodeStyle] = useState({} as any)
    // const { theme } = useTheme();

    // useEffect(() => {
    //     if (theme == "dark")
    //         setCodeStyle(atomOneDark)
    //     else
    //         setCodeStyle(atomOneLight)
    // }, [theme])

return (
    <div className="relative rounded code-bg mb-4 px-4">
        <ReactSyntaxHighlighter
            className="!bg-transparent"
            showLineNumbers={true}
            language={language || "typescript"} style={theme || oneLight} >
            {code}
        </ReactSyntaxHighlighter>
    </div>

)
}