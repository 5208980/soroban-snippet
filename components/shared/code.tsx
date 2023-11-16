export interface CodeProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const Code = ({ children, ...props }: CodeProps) => {
    return (
        <code className={`text-blue-600`} {...props} >
            {children}
        </code >
    )
}