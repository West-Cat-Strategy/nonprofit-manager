import CaseForm from '../../../components/CaseForm';

const CaseCreate = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Case</h1>
          <p className="text-gray-600 mt-1">Create a new case for a client</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <CaseForm />
        </div>
      </div>
    </div>
  );
};

export default CaseCreate;
