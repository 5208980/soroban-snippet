export interface TitleProps
    extends React.HTMLAttributes<HTMLDivElement> {
}

export const Title = ({ children, ...props }: TitleProps) => {
    return (
        <h2 className={`text-4xl font-bold leading-6 py-12 ${children}`} {...props} >
            {children}
        </h2 >
    )
}