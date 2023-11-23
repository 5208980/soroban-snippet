"use client";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    override?: boolean;
}

export const Input = ({ override, children, ...props }: InputProps) => {
    return (
        <input className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" {...props} />
    )
}