export interface Header3Props
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const Header3 = ({ children, ...props }: Header3Props) => {
    return (
        <h2 className={`text-lg font-bold leading-6 py-2 ${children}`} {...props} >
            {children}
        </h2 >
    )
}