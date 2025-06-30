import React from 'react';

export const TwitterShareBtn = ({ amount }) =>
  <a
    href={`https://x.com/intent/post?text=SENDING%20PROOF%20OF%20ALIGNMENT.%0A%0AI%20just%20claimed%20${amount.slice(0, -18)}%20%24ALIGN%20%F0%9F%9F%A9%20Thank%20you%20%40AlignedFndn%20%40alignedlayer%0A%0AClaim%20your%20%24ALIGN%20at%20https%3A%2F%2Fgenesis.alignedfoundation.org%20%0A%0ALearn%20more%20about%20aligned%20at%3A%20https%3A%2F%2Fblog.alignedlayer.com%2F`}
    className="bg-black text-white rounded-full py-1 px-[12px]"
    target="_blank"
    rel="noopener noreferrer"
    style={{ width: "9rem" }}
  >
    Share on
    <svg
      className="inline-block"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  </a>
