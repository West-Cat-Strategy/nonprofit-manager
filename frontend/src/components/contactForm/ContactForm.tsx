import React from 'react';
import { useContactForm } from './useContactForm';
import PersonalInfoSection from './sections/PersonalInfoSection';
import ContactInfoSection from './sections/ContactInfoSection';
import AddressSection from './sections/AddressSection';
import RolesSection from './sections/RolesSection';
import TagsSection from './sections/TagsSection';
import NotesSection from './sections/NotesSection';
import RelationshipsSection from './sections/RelationshipsSection';
import FormActions from './sections/FormActions';
import type { ContactRecord } from './types';

interface ContactFormProps {
  contact?: ContactRecord;
  mode: 'create' | 'edit';
  onCreated?: (contact: ContactRecord) => void;
  onCancel?: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ contact, mode, onCreated, onCancel }) => {
  const {
    formData,
    errors,
    isSubmitting,
    availableRoles,
    rolesLoading,
    relationships,
    relationshipsLoading,
    contacts,
    isAddingRelationship,
    relationshipSearch,
    relationshipData,
    filteredContacts,
    availableTags,
    handleChange,
    handleToggleRole,
    handleNoFixedAddressChange,
    handleAddTag,
    handleRemoveTag,
    handleSubmit,
    handleCancel,
    setIsAddingRelationship,
    setRelationshipSearch,
    handleSelectRelationshipContact,
    handleRelationshipTypeChange,
    handleRelationshipLabelChange,
    handleAddRelationship,
    handleDeleteRelationship,
    resetRelationshipForm,
    handleNavigateToContact,
    handleCreateNewContact,
  } = useContactForm({ contact, mode, onCreated, onCancel });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <RelationshipsSection
        mode={mode}
        firstName={formData.first_name}
        relationshipsLoading={relationshipsLoading}
        relationships={relationships}
        contacts={contacts}
        isAddingRelationship={isAddingRelationship}
        relationshipSearch={relationshipSearch}
        relationshipData={relationshipData}
        filteredContacts={filteredContacts}
        onRelationshipSearchChange={setRelationshipSearch}
        onSelectRelationshipContact={handleSelectRelationshipContact}
        onRelationshipTypeChange={handleRelationshipTypeChange}
        onRelationshipLabelChange={handleRelationshipLabelChange}
        onSubmitRelationship={handleAddRelationship}
        onCancelRelationship={resetRelationshipForm}
        onStartRelationship={() => setIsAddingRelationship(true)}
        onDeleteRelationship={handleDeleteRelationship}
        onNavigateToContact={handleNavigateToContact}
        onCreateNewContact={handleCreateNewContact}
      />

      <PersonalInfoSection
        formData={formData}
        errors={errors}
        onChange={handleChange}
      />

      <RolesSection
        rolesLoading={rolesLoading}
        availableRoles={availableRoles}
        selectedRoles={formData.roles || []}
        onToggleRole={handleToggleRole}
      />

      <TagsSection
        formData={formData}
        availableTags={availableTags}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
      />

      <ContactInfoSection
        formData={formData}
        errors={errors}
        onChange={handleChange}
      />

      <AddressSection
        formData={formData}
        errors={errors}
        noFixedAddress={formData.no_fixed_address || false}
        onChange={handleChange}
        onNoFixedAddressChange={handleNoFixedAddressChange}
      />

      <NotesSection
        formData={formData}
        mode={mode}
        onChange={handleChange}
      />

      <FormActions
        isSubmitting={isSubmitting}
        mode={mode}
        onCancel={handleCancel}
      />
    </form>
  );
};
