import React from "react";

export type ColumnBody = {
	rows: JSX.Element[];
};

export type ColumnHead = {
	text: string;
};

type Props = React.ComponentProps<"table"> & {
	header: ColumnHead[];
	body: ColumnBody[];
};

export const TableBodyItem = ({
	text,
	className,
	...props
}: React.ComponentProps<"td"> & { text: string }) => {
	return (
		<td className={`p-0 text-md ${className}`} {...props}>
			{text}
		</td>
	);
};

export const Table = ({ header, body, className, ...props }: Props) => {
	return (
		<table
			className={`table-fixed h-full w-full border-collapse ${className}`}
			{...props}
		>
			<thead>
				<tr>
					{header.map((row, i) => (
						<th
							key={i}
							className="text-left text-text-200 font-normal"
						>
							{row.text}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{body.map((item, i) => (
					<tr
						key={i}
						className="gap-y-2 [&>td]:pb-2 animate-in fade-in-0 duration-700 truncat"
					>
						{item.rows.map(row => row)}
					</tr>
				))}
			</tbody>
		</table>
	);
};
