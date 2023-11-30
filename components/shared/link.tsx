import Link from 'next/link'

export interface LinkProps
    extends React.HTMLAttributes<HTMLAnchorElement> {
    target?: "_blank" | "_self" | "_parent" | "_top" | "framename";
    href: string;
}

export const Reference = ({ href, target, children, ...props }: LinkProps) => {
    return (
        <Link href={href} target={target} className={`text-blue-600`} {...props} >
            {" "}{children}
        </Link>
    )
}