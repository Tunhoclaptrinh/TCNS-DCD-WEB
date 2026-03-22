import { Tabs } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import DutyCalendar from './DutyCalendar';
import DutyManagement from './Management';

const DutyPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin';

  const items = [
    {
      key: 'calendar',
      label: 'Lịch Trực Tuần',
      children: <DutyCalendar isAdmin={isAdmin} user={user} />,
    },
    ...(isAdmin ? [{
      key: 'management',
      label: 'Thiết Lập',
      children: <DutyManagement />,
    }] : []),
  ];

  return (
    <Tabs defaultActiveKey="calendar" items={items} />
  );
};

export default DutyPage;
