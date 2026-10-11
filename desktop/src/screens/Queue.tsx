import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { openQueue } from '../store/uiSlice';

const Queue = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(openQueue());
    navigate('/home', { replace: true });
  }, [dispatch, navigate]);

  return null;
};
export default Queue;
