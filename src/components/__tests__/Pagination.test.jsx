import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from '../../components/Pagination'

describe('Pagination', () => {
  it('renders nothing when totalItems <= itemsPerPage', () => {
    const { container } = render(
      <Pagination currentPage={1} totalItems={5} onPageChange={() => {}} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders correct number of page buttons', () => {
    render(
      <Pagination currentPage={1} totalItems={25} onPageChange={() => {}} itemsPerPage={10} />
    )
    // 3 pages: 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onPageChange with correct page number', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(
      <Pagination currentPage={1} totalItems={30} onPageChange={onPageChange} itemsPerPage={10} />
    )

    await user.click(screen.getByText('2'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables prev button on first page', () => {
    render(
      <Pagination currentPage={1} totalItems={30} onPageChange={() => {}} itemsPerPage={10} />
    )

    const prevBtn = screen.getByLabelText('Halaman sebelumnya')
    expect(prevBtn).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(
      <Pagination currentPage={3} totalItems={30} onPageChange={() => {}} itemsPerPage={10} />
    )

    const nextBtn = screen.getByLabelText('Halaman berikutnya')
    expect(nextBtn).toBeDisabled()
  })

  it('highlights current page', () => {
    render(
      <Pagination currentPage={2} totalItems={30} onPageChange={() => {}} itemsPerPage={10} />
    )

    const page2Btn = screen.getByText('2')
    expect(page2Btn.className).toContain('bg-primary')
  })
})
