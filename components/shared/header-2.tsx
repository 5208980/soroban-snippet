export interface Header2Props
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const Header2 = ({ children, ...props }: Header2Props) => {
    return (
        <h2 className={`text-2xl font-bold leading-8 py-6 ${children}`} {...props} >
            {children}
        </h2 >
    )
}