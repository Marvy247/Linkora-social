import React from 'react';
import renderer from 'react-test-renderer';
import { EmptyState } from '../EmptyState';

describe('EmptyState Snapshots', () => {
  const defaultProps = {
    title: 'No Posts Yet',
    description: 'Start following people or create your first post to see content in your feed.',
  };

  it('renders default state correctly', () => {
    const tree = renderer.create(<EmptyState {...defaultProps} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders loading state correctly', () => {
    const tree = renderer.create(<EmptyState {...defaultProps} isLoading={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with action button correctly', () => {
    const mockOnActionPress = jest.fn();
    const tree = renderer.create(
      <EmptyState
        {...defaultProps}
        actionText="Create Post"
        onActionPress={mockOnActionPress}
      />
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with custom testID correctly', () => {
    const tree = renderer.create(
      <EmptyState {...defaultProps} testID="custom-empty-state" />
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with long title and description correctly', () => {
    const longProps = {
      title: 'Your Investment Portfolio is Currently Empty',
      description: 'You haven\'t made any investments yet. Explore our curated pools and start building your diversified cryptocurrency portfolio today. Our expert-managed pools offer various risk levels and investment strategies.',
    };
    const tree = renderer.create(<EmptyState {...longProps} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders loading state with action button correctly', () => {
    const mockOnActionPress = jest.fn();
    const tree = renderer.create(
      <EmptyState
        {...defaultProps}
        isLoading={true}
        actionText="Get Started"
        onActionPress={mockOnActionPress}
      />
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});