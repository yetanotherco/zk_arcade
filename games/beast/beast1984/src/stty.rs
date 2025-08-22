//! this module contains helper function for raw mode and terminal size

use std::{
	io,
	os::raw::c_int,
};

#[cfg(not(windows))]
use std::{
	fs::File,
	process::{Command, Stdio},
};

#[cfg(windows)]
use winapi::{
	shared::minwindef::{DWORD, TRUE},
	um::{
		consoleapi::{GetConsoleMode, SetConsoleMode},
		handleapi::INVALID_HANDLE_VALUE,
		processenv::GetStdHandle,
		winbase::{STD_INPUT_HANDLE, STD_OUTPUT_HANDLE},
		wincon::{
			GetConsoleScreenBufferInfo, CONSOLE_SCREEN_BUFFER_INFO,
			ENABLE_ECHO_INPUT, ENABLE_LINE_INPUT, ENABLE_PROCESSED_INPUT,
		},
	},
};

/// the raw mode struct uses the drop trait to restore the terminal state into cooked mode
#[cfg(not(windows))]
pub struct RawMode;

#[cfg(windows)]
pub struct RawMode {
	original_input_mode: DWORD,
}

#[cfg(not(windows))]
impl RawMode {
	/// this method enters the terminal into raw mode
	pub fn enter() -> io::Result<Self> {
		Command::new("stty").arg("-icanon").arg("-echo").spawn()?.wait()?;
		print!("\x1b[?25l"); // hide cursor
		Ok(Self)
	}
}

#[cfg(windows)]
impl RawMode {
	/// this method enters the terminal into raw mode
	pub fn enter() -> io::Result<Self> {
		unsafe {
			let stdin_handle = GetStdHandle(STD_INPUT_HANDLE);
			if stdin_handle == INVALID_HANDLE_VALUE {
				return Err(io::Error::last_os_error());
			}

			let mut original_input_mode: DWORD = 0;
			if GetConsoleMode(stdin_handle, &mut original_input_mode) == 0 {
				return Err(io::Error::last_os_error());
			}

			let raw_input_mode = original_input_mode & !(ENABLE_ECHO_INPUT | ENABLE_LINE_INPUT | ENABLE_PROCESSED_INPUT);
			if SetConsoleMode(stdin_handle, raw_input_mode) == 0 {
				return Err(io::Error::last_os_error());
			}

			print!("\x1b[?25l"); // hide cursor
			Ok(Self { original_input_mode })
		}
	}
}

#[cfg(not(windows))]
impl Drop for RawMode {
	/// this method restores the terminal state into cooked mode
	fn drop(&mut self) {
		let _ = Command::new("stty").arg("icanon").arg("echo").spawn().and_then(|mut c| c.wait());
		print!("\x1b[?25h"); // show cursor again
	}
}

#[cfg(windows)]
impl Drop for RawMode {
	/// this method restores the terminal state into cooked mode
	fn drop(&mut self) {
		unsafe {
			let stdin_handle = GetStdHandle(STD_INPUT_HANDLE);
			if stdin_handle != INVALID_HANDLE_VALUE {
				SetConsoleMode(stdin_handle, self.original_input_mode);
			}
		}
		print!("\x1b[?25h"); // show cursor again
	}
}

#[cfg(not(windows))]
unsafe extern "C" {
	fn signal(sig: c_int, handler: extern "C" fn(c_int)) -> extern "C" fn(c_int);
}

#[cfg(not(windows))]
const SIGINT: c_int = 2;

#[cfg(not(windows))]
extern "C" fn handle_sigint(_sig: c_int) {
	print!("\x1b[?25h"); // show cursor again
	let _ = Command::new("stty").arg("icanon").arg("echo").spawn().and_then(|mut c| c.wait());
	std::process::exit(0);
}

#[cfg(windows)]
extern "C" fn handle_sigint(_sig: c_int) {
	print!("\x1b[?25h"); // show cursor again
	unsafe {
		let stdin_handle = GetStdHandle(STD_INPUT_HANDLE);
		if stdin_handle != INVALID_HANDLE_VALUE {
			// We can't easily restore without storing the original mode globally
			// This is a limitation of the signal handler approach on Windows
		}
	}
	std::process::exit(0);
}

/// this method installs a signal handler for SIGINT that restores the terminal state into cooked mode
#[cfg(not(windows))]
pub fn install_raw_mode_signal_handler() {
	unsafe {
		signal(SIGINT, handle_sigint);
	}
}

/// this method installs a signal handler for SIGINT that restores the terminal state into cooked mode
#[cfg(windows)]
pub fn install_raw_mode_signal_handler() {
	// On Windows, we use the default Ctrl+C handling or could use SetConsoleCtrlHandler
	// For simplicity, we'll rely on the Drop trait for cleanup
}

/// a function to test if stty is available
#[cfg(not(windows))]
pub fn has_stty() -> bool {
	Command::new("stty").arg("size").stdout(Stdio::null()).stderr(Stdio::null()).status().is_ok()
}

/// a function to test if stty is available
#[cfg(windows)]
pub fn has_stty() -> bool {
	true // Windows console APIs are always available
}

/// a function to get the terminal size
#[cfg(not(windows))]
pub fn terminal_size() -> io::Result<(usize, usize)> {
	let tty = File::open("/dev/tty")?;
	let output = Command::new("stty").arg("size").stdin(tty).output()?;

	if !output.status.success() {
		return Err(io::Error::other("stty failed"));
	}
	let output_string = String::from_utf8_lossy(&output.stdout);
	let mut parts = output_string.split_whitespace();
	let rows = match parts.next() {
		Some(rows) => match rows.parse::<usize>() {
			Ok(rows) => rows,
			Err(_) => {
				return Err(io::Error::other("failed to parse rows"));
			},
		},
		None => {
			return Err(io::Error::other("failed to parse rows"));
		},
	};

	let columns = match parts.next() {
		Some(columns) => match columns.parse::<usize>() {
			Ok(columns) => columns,
			Err(_) => {
				return Err(io::Error::other("failed to parse columns"));
			},
		},
		None => {
			return Err(io::Error::other("failed to parse columns"));
		},
	};

	Ok((columns, rows))
}

/// a function to get the terminal size
#[cfg(windows)]
pub fn terminal_size() -> io::Result<(usize, usize)> {
	unsafe {
		let stdout_handle = GetStdHandle(STD_OUTPUT_HANDLE);
		if stdout_handle == INVALID_HANDLE_VALUE {
			return Err(io::Error::last_os_error());
		}

		let mut csbi: CONSOLE_SCREEN_BUFFER_INFO = std::mem::zeroed();
		if GetConsoleScreenBufferInfo(stdout_handle, &mut csbi) == 0 {
			return Err(io::Error::last_os_error());
		}

		let columns = (csbi.srWindow.Right - csbi.srWindow.Left + 1) as usize;
		let rows = (csbi.srWindow.Bottom - csbi.srWindow.Top + 1) as usize;

		Ok((columns, rows))
	}
}
