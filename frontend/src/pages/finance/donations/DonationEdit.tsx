/**
 * DonationEdit Page
 * Page for editing an existing donation
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchDonationById, updateDonation } from '../../../store/slices/donationsSlice';
import DonationForm from '../../../components/DonationForm';
import type { UpdateDonationDTO } from '../../../types/donation';

const DonationEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { selectedDonation, loading, error } = useAppSelector((state) => state.donations);

  useEffect(() => {
    if (id) {
      dispatch(fetchDonationById(id));
    }
  }, [id, dispatch]);

  const handleSubmit = async (donationData: UpdateDonationDTO) => {
    if (!id) return;
    await dispatch(updateDonation({ donationId: id, donationData })).unwrap();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-app-text-muted">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-100 text-red-700 rounded-md">Error: {error}</div>
      </div>
    );
  }

  if (!selectedDonation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-yellow-100 text-yellow-700 rounded-md">Donation not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-app-text">Edit Donation</h1>
        <p className="mt-2 text-app-text-muted">Donation #{selectedDonation.donation_number}</p>
      </div>

      <DonationForm donation={selectedDonation} onSubmit={handleSubmit} isEdit />
    </div>
  );
};

export default DonationEdit;
