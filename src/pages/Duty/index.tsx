import { Outlet } from 'react-router-dom';

const DutyPage: React.FC = () => {
  return (
    <div className="duty-page-container">
      <Outlet />
    </div>
  );
};

export default DutyPage;
