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
        <div onClick={scrollToTop} className='bg-primary p-3 rounded-full cursor-pointer hover:bg-red-400 text-white'>
            <ArrowUp />
        </div>
    )
}

export default GoTop