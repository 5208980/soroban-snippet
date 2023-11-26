"use client";

import { useEffect, useState } from "react";

export interface CollapsibleProps
    extends React.HTMLAttributes<HTMLDivElement> {
    isSelected: string,
    title: string,
    handleOnClick: Function,
    checked?: boolean,
    items?: { name: string, spec: JSX.Element }[]
}

export const Collapsible = ({
    title,
    isSelected,
    handleOnClick,
    checked = false,
    items = [],
}: CollapsibleProps) => {
    const [open, setOpen] = useState<boolean>(false);

    useEffect(() => {
        setOpen(checked);
        items.forEach((item) => {
            console.log(isSelected)
            if (isSelected === item.name) {
                setOpen(true);
            }
        })
    }, []);

    const handleOnChange = () => {
        setOpen(!open);
    }

    const handleSideItemClick = (e: any, item: any) => {
        e.preventDefault();
        handleOnClick(item);
    }

    return (
        <label>
            <input className="peer absolute scale-0" type="checkbox" onChange={handleOnChange} checked={open} />
            <span className="block max-h-14 overflow-hidden rounded-lg px-4 py-0 transition-all duration-300 peer-checked:max-h-full">
                <h3 className="flex h-14 px-4 uppercase text-main-secondary font-bold tracking-wider cursor-pointer items-center">{title}</h3>
                <ul>
                    {items.map((item, index) => (
                        <li className={`px-4 py-2 flex items-center text-main rounded-md hover:bg-blue-100 cursor-pointer
                                        ${(isSelected === item.name) && "text-main-secondary font-bold"}`}
                            key={index}
                            onClick={(e) => handleSideItemClick(e, item)}
                        >{item.name}</li>
                    ))}
                </ul>
            </span>
        </label>
    )
}