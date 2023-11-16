export interface UListProps
    extends React.HTMLAttributes<HTMLUListElement> {
}

export const UList = ({ children, ...props }: UListProps) => {
    return (
        <ul className={`list-disc ml-4 mb-4 ${children}`} {...props}>
            {children}
        </ul>
    )
}