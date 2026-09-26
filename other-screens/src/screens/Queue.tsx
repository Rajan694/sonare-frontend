import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../store'
import { openQueue } from '../store/uiSlice'

export default function Queue() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(openQueue())
    navigate('/home', { replace: true })
  }, [dispatch, navigate])

  return null
}
