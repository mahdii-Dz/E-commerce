'use client'
import { ArrowUp } from "lucide-react"

function GoTop() {
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    return (
        <button onClick={scrollToTop} aria-label="Scroll to top" className='bg-primary p-3 rounded-full cursor-pointer hover:bg-red-400 text-white'>
            <ArrowUp />
        </button>
    )
}

export default GoTop