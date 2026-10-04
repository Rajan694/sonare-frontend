import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The type scale in styles.css (`text-body-m`, `text-display-m`, …). Unregistered, tailwind-merge
// reads them as text colours, so cn('text-body-m', 'text-acc') silently dropped the size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'display-m',
            'h1',
            'h2',
            'title-l',
            'title-m',
            'body-l',
            'body-m',
            'body-s',
            'label-l',
            'label-m',
            'label-s',
            'overline',
            'mono-m',
            'mono-s',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
