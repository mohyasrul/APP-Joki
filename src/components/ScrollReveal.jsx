import { useEffect, useRef } from 'react';

export default function ScrollReveal({ children, className = '', delay = 0, style = {} }) {
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    ref.current?.classList.add('active');
                }
            },
            {
                root: null,
                rootMargin: '0px',
                threshold: 0.1,
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    const delayClass = delay > 0 ? ` delay-${delay}` : '';

    return (
        <div ref={ref} className={`reveal ${className}${delayClass}`} style={style}>
            {children}
        </div>
    );
}
