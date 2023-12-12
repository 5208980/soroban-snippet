export interface MessageProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const Message = ({ children, ...props }: MessageProps) => {
    return (
        <div className="bg-main text-blue-600 text-center font-bold border-b" {...props} >
            {children}
        </div >
    )
}