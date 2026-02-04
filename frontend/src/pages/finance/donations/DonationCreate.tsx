/**
 * DonationCreate Page
 * Page for creating a new donation
 */

import React from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { createDonation } from '../../../store/slices/donationsSlice';
import DonationForm from '../../../components/DonationForm';
import type { CreateDonationDTO, UpdateDonationDTO } from '../../../types/donation';

const DonationCreate: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleSubmit = async (donationData: CreateDonationDTO | UpdateDonationDTO) => {
    await dispatch(createDonation(donationData as CreateDonationDTO)).unwrap();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Record New Donation</h1>
        <p className="mt-2 text-gray-600">Enter the donation details below.</p>
      </div>

      <DonationForm onSubmit={handleSubmit} />
    </div>
  );
};

export default DonationCreate;
